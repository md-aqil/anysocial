export async function uploadFile(file: File): Promise<string> {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
  const res = await fetch(`${API_BASE}/api/reels/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'No response body');
    throw new Error(`Failed to upload media (HTTP ${res.status}): ${errorText.substring(0, 100)}`);
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to upload product media');
  }

  return data.url;
}