[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$base = "http://127.0.0.1:8001/api/v1"
$pass = 0; $fail = 0
function Check($name, $ok, $detail = "") {
    if ($ok) { Write-Host "  OK  $name" -ForegroundColor Green; $script:pass++ }
    else     { Write-Host "  FAIL $name  $detail" -ForegroundColor Red; $script:fail++ }
}
# Reset Ali's chat sessions so results are deterministic
python -c "from app.db.session import SessionLocal; from app.models.chat import ChatSession; from app.models.user import User; db = SessionLocal(); ali = db.query(User).filter(User.email=='ali@example.com').first(); db.query(ChatSession).filter(ChatSession.patient_id==ali.id).delete(); db.commit(); db.close()" | Out-Null
Write-Host "=== 1. HEALTH ===" -ForegroundColor Cyan
try {
    $h = Invoke-RestMethod -Uri "http://127.0.0.1:8001/health"
    Check "Health endpoint reachable" ($h.status -eq "ok")
} catch { Check "Health" $false $_.Exception.Message }
Write-Host "=== 2. LOGIN (patient) ===" -ForegroundColor Cyan
$login = $null
try {
    $body = @{ email = "ali@example.com"; password = "patient123" } | ConvertTo-Json
    $login = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body $body -ContentType "application/json"
    $token = $login.access_token
    $headers = @{ Authorization = "Bearer $token" }
    Check "Login successful" ($login.user.role -eq "patient")
} catch { Check "Login" $false $_.Exception.Message }
if (-not $login) { Write-Host "STOP: no login, cannot proceed." -ForegroundColor Red; exit }
Write-Host "=== 3. CREATE CHAT SESSION ===" -ForegroundColor Cyan
$session = $null
try {
    $session = Invoke-RestMethod -Uri "$base/chat/sessions" -Method POST -Headers $headers
    $sessionId = $session.id
    Check "Session created" ($session.status -eq "active")
} catch { Check "Create session" $false $_.Exception.Message; $sessionId = $null }
Write-Host "=== 4. IN-DOMAIN MESSAGE ===" -ForegroundColor Cyan
if ($sessionId) {
    try {
        $msgBody = @{ content = "Hi, I have a toothache and want to book an appointment"; is_voice = $false } | ConvertTo-Json
        $reply1 = Invoke-RestMethod -Uri "$base/chat/sessions/$sessionId/messages" -Method POST -Headers $headers -Body $msgBody -ContentType "application/json"
        Check "Bot replied" ($reply1.sender -eq "bot" -and $reply1.content.Length -gt 10)
    } catch { Check "In-domain message" $false $_.Exception.Message }
    Write-Host "=== 5. OFF-TOPIC MESSAGE ===" -ForegroundColor Cyan
    try {
        $offBody = @{ content = "What is 2 + 2?"; is_voice = $false } | ConvertTo-Json
        $reply2 = Invoke-RestMethod -Uri "$base/chat/sessions/$sessionId/messages" -Method POST -Headers $headers -Body $offBody -ContentType "application/json"
        Check "Guardrail refused" ($reply2.content -match "receptionist")
    } catch { Check "Guardrail" $false $_.Exception.Message }
    Write-Host "=== 6. SESSION HISTORY ===" -ForegroundColor Cyan
    try {
        $full = Invoke-RestMethod -Uri "$base/chat/sessions/$sessionId" -Headers $headers
        Check "4 messages" ($full.messages.Count -eq 4) "count=$($full.messages.Count)"
    } catch { Check "Session history" $false $_.Exception.Message }
}
Write-Host "=== 7. PATIENT BLOCKED FROM /patients ===" -ForegroundColor Cyan
try {
    Invoke-RestMethod -Uri "$base/patients" -Headers $headers -ErrorAction Stop | Out-Null
    Check "Patient SHOULD be blocked" $false "got 200"
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Check "Patient blocked (403)" ($code -eq 403) "got $code"
}
Write-Host "=== 8. DOCTOR CAN LIST /patients ===" -ForegroundColor Cyan
$docHeaders = $null; $docLogin = $null
try {
    $docBody = @{ email = "ahmed@dentalclinic.com"; password = "doctor123" } | ConvertTo-Json
    $docLogin = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body $docBody -ContentType "application/json"
    $docHeaders = @{ Authorization = "Bearer $($docLogin.access_token)" }
    $patients = Invoke-RestMethod -Uri "$base/patients" -Headers $docHeaders
    Check "Doctor sees 3+ patients" ($patients.Count -ge 3) "count=$($patients.Count)"
} catch { Check "Doctor list patients" $false $_.Exception.Message }
Write-Host "=== 9. DOCTOR BLOCKED FROM /chat ===" -ForegroundColor Cyan
if ($docHeaders) {
    try {
        Invoke-RestMethod -Uri "$base/chat/sessions" -Method POST -Headers $docHeaders -ErrorAction Stop | Out-Null
        Check "Doctor SHOULD be blocked" $false "got 200"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Check "Doctor blocked (403)" ($code -eq 403) "got $code"
    }
} else { Check "Doctor blocked" $false "no doc token" }
Write-Host "=== 10. MEMORY SERVICE (close session creates summary) ===" -ForegroundColor Cyan
if ($sessionId) {
    try {
        $closed = Invoke-RestMethod -Uri "$base/chat/sessions/$sessionId/close" -Method POST -Headers $headers
        Check "Session closed" ($closed.status -eq "closed") "status=$($closed.status)"
        Start-Sleep -Seconds 1
        $raw = python -c "import os; os.environ['DEBUG']='false'; from app.db.session import SessionLocal; from app.models.chat import SessionMemory; db = SessionLocal(); print('RESULT:' + str(db.query(SessionMemory).count())); db.close()"
        $memCount = ($raw | Select-String -Pattern 'RESULT:(\d+)').Matches.Groups[1].Value
        Check "Memory row created" ([int]$memCount -ge 1) "memories=$memCount"
    } catch { Check "Memory/close" $false $_.Exception.Message }
} else { Check "Memory (no session)" $false "skipped" }
Write-Host "=== 11. HANDOFF (patient -> doctor thread) ===" -ForegroundColor Cyan
$threadId = $null
try {
    $newSession = Invoke-RestMethod -Uri "$base/chat/sessions" -Method POST -Headers $headers
    $newSessionId = $newSession.id
    $msg = @{ content = "I want to speak to the doctor about my braces"; is_voice = $false } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/chat/sessions/$newSessionId/messages" -Method POST -Headers $headers -Body $msg -ContentType "application/json" | Out-Null
    $handoffBody = @{ doctor_id = $docLogin.user.id } | ConvertTo-Json
    $thread = Invoke-RestMethod -Uri "$base/threads/handoff" -Method POST -Headers $headers -Body $handoffBody -ContentType "application/json"
    $threadId = $thread.id
    Check "Handoff thread created" ($threadId -gt 0) "thread=$threadId"
} catch { Check "Handoff" $false $_.Exception.Message }
if ($threadId -and $docHeaders) {
    try {
        $inbox = Invoke-RestMethod -Uri "$base/threads" -Headers $docHeaders
        Check "Doctor sees thread in inbox" ($inbox.Count -ge 1) "count=$($inbox.Count)"
        $replyBody = @{ content = "Hi Ali, I can see you tomorrow at 10am." } | ConvertTo-Json
        $docMsg = Invoke-RestMethod -Uri "$base/threads/$threadId/messages" -Method POST -Headers $docHeaders -Body $replyBody -ContentType "application/json"
        Check "Doctor replied" ($docMsg.content.Length -gt 5)
        $detail = Invoke-RestMethod -Uri "$base/threads/$threadId" -Headers $headers
        Check "Patient sees doctor reply" ($detail.messages.Count -ge 1) "msgs=$($detail.messages.Count)"
    } catch { Check "Thread flow" $false $_.Exception.Message }
} else { Check "Thread flow (skipped)" $false "no threadId/docHeaders" }
Write-Host "=== 12. AVAILABILITY BLOCK + RESCHEDULE NOTICES ===" -ForegroundColor Cyan
if ($docHeaders) {
    try {
        $now = Get-Date
        $start = $now.AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss")
        $end = $now.AddDays(8).ToString("yyyy-MM-ddTHH:mm:ss")
        $blockBody = @{ start_time = $start; end_time = $end; reason = "Test block" } | ConvertTo-Json
        $block = Invoke-RestMethod -Uri "$base/appointments/availability-blocks" -Method POST -Headers $docHeaders -Body $blockBody -ContentType "application/json"
        Check "Availability block created" ($block.id -gt 0) "id=$($block.id), affected=$($block.affected_appointment_ids.Count)"
    } catch { Check "Availability block" $false $_.Exception.Message }
} else { Check "Availability block" $false "no doc token" }
Write-Host "=== 13. QR IDENTITY ===" -ForegroundColor Cyan
$qrToken = $null
try {
    $qr = Invoke-RestMethod -Uri "$base/qr/me" -Headers $headers
    $qrToken = $qr.token
    Check "QR generated" ($qr.image.Length -gt 100) "image_len=$($qr.image.Length)"
} catch { Check "QR generate" $false $_.Exception.Message }
if ($qrToken -and $docHeaders) {
    try {
        $resolveBody = @{ token = $qrToken } | ConvertTo-Json
        $resolved = Invoke-RestMethod -Uri "$base/qr/resolve" -Method POST -Headers $docHeaders -Body $resolveBody -ContentType "application/json"
        Check "Doctor resolves QR" ($resolved.email -eq "ali@example.com") "email=$($resolved.email)"
    } catch { Check "QR resolve" $false $_.Exception.Message }
} else { Check "QR resolve (skipped)" $false "no token or doctor" }
Write-Host "=== 14. VOICE TTS ===" -ForegroundColor Cyan
try {
    $ttsBody = @{ text = "Hello from the clinic" } | ConvertTo-Json
    $tts = Invoke-RestMethod -Uri "$base/voice/tts" -Method POST -Headers $headers -Body $ttsBody -ContentType "application/json"
    $ok = ($tts.dev_stub -eq $true) -or ($tts.audio_base64.Length -gt 100)
    Check "TTS responded" $ok "stub=$($tts.dev_stub)"
} catch { Check "Voice TTS" $false $_.Exception.Message }
Write-Host "=== 15. DOCTOR DASHBOARD KPIs ===" -ForegroundColor Cyan
if ($docHeaders) {
    try {
        $kpis = Invoke-RestMethod -Uri "$base/dashboard/kpis" -Headers $docHeaders
        $hasAll = ($null -ne $kpis.kpis.total_patients) -and
                  ($null -ne $kpis.kpis.appointments) -and
                  ($null -ne $kpis.kpis.pending_threads) -and
                  ($null -ne $kpis.kpis.rating)
        Check "All 4 KPIs present" $hasAll
        Write-Host "     Total patients: $($kpis.kpis.total_patients.total) (new: $($kpis.kpis.total_patients.new_this_month))" -ForegroundColor Gray
        Write-Host "     Appointments today: $($kpis.kpis.appointments.today) | this week: $($kpis.kpis.appointments.this_week)" -ForegroundColor Gray
        Write-Host "     Pending threads: $($kpis.kpis.pending_threads)" -ForegroundColor Gray
        Write-Host "     Rating: $($kpis.kpis.rating.average) ($($kpis.kpis.rating.count) reviews)" -ForegroundColor Gray
    } catch { Check "Dashboard KPIs" $false $_.Exception.Message }
} else { Check "Dashboard KPIs" $false "no doc token" }
Write-Host ""
Write-Host "════════════════════════════════════════════════════" -ForegroundColor Cyan
if ($fail -eq 0) {
    Write-Host "  ALL $pass CHECKS PASSED" -ForegroundColor Green
} else {
    Write-Host "  $pass passed / $fail failed" -ForegroundColor Yellow
}
Write-Host "════════════════════════════════════════════════════" -ForegroundColor Cyan
