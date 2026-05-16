$ErrorActionPreference = "Stop"

Set-Location "C:\Users\Moom\Downloads\easypips-web"

$file = "app\components\EasyPipsShell.tsx"

if (!(Test-Path $file)) {
    Write-Host "EasyPipsShell.tsx not found" -ForegroundColor Red
    exit
}

$content = Get-Content $file -Raw

# =========================================================
# TOAST STATE
# =========================================================

if ($content -notmatch "const \[toasts") {
    $content = $content -replace 'const \[isPremium, setIsPremium\] = useState\(false\);', @'
const [isPremium, setIsPremium] = useState(false);

const [toasts, setToasts] = useState<
  {
    id: number;
    title: string;
    message: string;
    type: "success" | "warning" | "info";
  }[]
>([]);
'@
}

# =========================================================
# MOBILE MENU STATE
# =========================================================

if ($content -notmatch "mobileMenuOpen") {
    $content = $content -replace 'const \[cat, setCat\] = useState\("Major"\);', @'
const [cat, setCat] = useState("Major");
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
const [search, setSearch] = useState("");
'@
}

# =========================================================
# TOAST FUNCTION
# =========================================================

if ($content -notmatch "function pushToast") {
    $toastFn = @'
function pushToast(
  title: string,
  message: string,
  type: "success" | "warning" | "info" = "info"
) {
  const id = Date.now();

  setToasts((prev) => [
    ...prev,
    {
      id,
      title,
      message,
      type,
    },
  ]);

  setTimeout(() => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, 4500);
}
'@

    $content = $content -replace 'function disablePremiumPreview\(\) \{', "$toastFn`r`nfunction disablePremiumPreview() {"
}

# =========================================================
# PREMIUM TOAST
# =========================================================

$content = $content -replace 'function enablePremiumPreview\(\) \{[\s\S]*?setIsPremium\(true\);[\s\S]*?\n\s*\}', @'
function enablePremiumPreview() {
  try {
    localStorage.setItem("easypips-premium-access", "true");
    setIsPremium(true);

    pushToast(
      "Premium Activated",
      "Premium preview mode enabled successfully.",
      "success"
    );
  } catch {
    setIsPremium(true);
  }
}
'@

# =========================================================
Write-Host "git push origin main"