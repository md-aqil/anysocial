export async function uploadFile(file: File): Promise<string> {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/reels/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!res.ok) {
    throw new Error('Failed to upload product media to the server');
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to upload product media');
  }

  return data.url;
}