// Apply the saved theme before first paint (same key as next-themes) to avoid a flash.
{
  const theme = localStorage.getItem('theme') ?? 'system';
  const dark =
    theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}
