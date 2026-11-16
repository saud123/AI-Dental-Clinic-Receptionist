[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
# Auto-reset Ali's chat sessions before testing (deterministic results)
python -c "from app.db.session import SessionLocal; from app.models.chat import ChatSession; from app.models.user import User; db = SessionLocal(); ali = db.query(User).filter(User.email=='ali@example.com').first(); db.query(ChatSession).filter(ChatSession.patient_id==ali.id).delete(); db.commit(); db.close()" | Out-Null
$base = "http://127.0.0.1:8001/api/v1"
$pass = 0; $fail = 0
function Check($name, $ok, $detail = "") {
    if ($ok) { Write-Host "  OK  $name" -ForegroundColor Green; $script:pass++ }
    else     { Write-Host "  FAIL $name  $detail" -ForegroundColor Red; $script:fail++ }
}
Write-Host "=== 1. HEALTH ===" -ForegroundColor Cyan
try {
    $h = Invoke-RestMethod -Uri "http://127.0.0.1:8001/health"
    Check "Health endpoint reachable" ($h.status -eq "ok") "status=$($h.status)"
} catch { Check "Health endpoint" $false $_.Exception.Message }
Write-Host "=== 2. LOGIN (patient) ===" -ForegroundColor Cyan
$login = $null
try {
    $body = @{ email = "ali@example.com"; password = "patient123" } | ConvertTo-Json
    $login = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body $body -ContentType "application/json"
    $token = $login.access_token
    $headers = @{ Authorization = "Bearer $token" }
    Check "Login successful" ($login.user.role -eq "patient") "role=$($login.user.role)"
} catch { Check "Login" $false $_.Exception.Message }
if ($login) {
    Write-Host "=== 3. CREATE CHAT SESSION ===" -ForegroundColor Cyan
    try {
        $session = Invoke-RestMethod -Uri "$base/chat/sessions" -Method POST -Headers $headers
        $sessionId = $session.id
        Check "Session created" ($session.status -eq "active") "id=$sessionId"
    } catch { Check "Create session" $false $_.Exception.Message; $sessionId = $null }
    if ($sessionId) {
        Write-Host "=== 4. IN-DOMAIN MESSAGE ===" -ForegroundColor Cyan
        try {
            $msgBody = @{ content = "Hi, I have a toothache and want to book an appointment"; is_voice = $false } | ConvertTo-Json
            $reply1 = Invoke-RestMethod -Uri "$base/chat/sessions/$sessionId/messages" -Method POST -Headers $headers -Body $msgBody -ContentType "application/json"
            Check "Bot replied" ($reply1.sender -eq "bot" -and $reply1.content.Length -gt 10)
            Write-Host "     Bot: $($reply1.content)" -ForegroundColor Gray
        } catch { Check "In-domain message" $false $_.Exception.Message }
        Write-Host "=== 5. OFF-TOPIC MESSAGE ===" -ForegroundColor Cyan
        try {
            $offBody = @{ content = "What is 2 + 2?"; is_voice = $false } | ConvertTo-Json
            $reply2 = Invoke-RestMethod -Uri "$base/chat/sessions/$sessionId/messages" -Method POST -Headers $headers -Body $offBody -ContentType "application/json"
            Check "Guardrail refused" ($reply2.content -match "receptionist")
            Write-Host "     Bot: $($reply2.content)" -ForegroundColor Gray
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
    try {
        $docBody = @{ email = "ahmed@dentalclinic.com"; password = "doctor123" } | ConvertTo-Json
        $docLogin = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body $docBody -ContentType "application/json"
        $docHeaders = @{ Authorization = "Bearer $($docLogin.access_token)" }
        $patients = Invoke-RestMethod -Uri "$base/patients" -Headers $docHeaders
        Check "Doctor sees 3+ patients" ($patients.Count -ge 3) "count=$($patients.Count)"
    } catch { Check "Doctor list patients" $false $_.Exception.Message }
    Write-Host "=== 9. DOCTOR BLOCKED FROM /chat ===" -ForegroundColor Cyan
    try {
        Invoke-RestMethod -Uri "$base/chat/sessions" -Method POST -Headers $docHeaders -ErrorAction Stop | Out-Null
        Check "Doctor SHOULD be blocked" $false "got 200"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Check "Doctor blocked (403)" ($code -eq 403) "got $code"
    }
}
Write-Host ""
if ($fail -eq 0) {
    Write-Host "ALL $pass CHECKS PASSED" -ForegroundColor Green
} else {
    Write-Host "$pass passed / $fail failed" -ForegroundColor Yellow
}

