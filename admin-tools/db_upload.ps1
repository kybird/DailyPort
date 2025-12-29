# dailyport.db 업로드 스크립트

$DB_FILE = "dailyport.db"
$RELEASE_TAG = "db-sync"
$REPO_PATH = (git rev-parse --show-toplevel)

Set-Location $REPO_PATH

# gh CLI 체크
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "GitHub CLI(gh)가 설치되어 있지 않습니다. 서비스 사용을 위해 먼저 gh를 설치해 주세요."
    exit 1
}

# DB 파일 체크
if (-not (Test-Path $DB_FILE)) {
    Write-Error "$DB_FILE 파일을 찾을 수 없습니다."
    exit 1
}

Write-Host "GitHub Release ($RELEASE_TAG)에 DB 업로드를 시작합니다..."

# 기존 릴리즈 확인
$releaseExists = gh release view $RELEASE_TAG 2>&1
if ($lastExitCode -ne 0) {
    Write-Host "새로운 릴리즈($RELEASE_TAG)를 생성합니다."
    gh release create $RELEASE_TAG --title "Database Sync" --notes "공유용 데이터베이스 데이터입니다."
}

# 파일 업로드 (기존 파일이 있으면 덮어쓰기 위해 --clobber 사용)
gh release upload $RELEASE_TAG $DB_FILE --clobber

if ($lastExitCode -eq 0) {
    Write-Host "업로드 완료!" -ForegroundColor Green
} else {
    Write-Error "업로드 중 오류가 발생했습니다."
}
