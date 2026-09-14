export function downloadMedia(url: string, filenameBase: string) {
  try {
    let extension = ".svg";
    if (url.startsWith("http://") || url.startsWith("https://")) {
      extension = ".jpg";
    } else if (url.includes("image/png")) {
      extension = ".png";
    } else if (url.includes("image/jpeg") || url.includes("image/jpg")) {
      extension = ".jpg";
    } else if (url.includes("video/mp4")) {
      extension = ".mp4";
    }

    const cleanBase = filenameBase.replace(/\.[a-z0-9]+$/i, "").toLowerCase().replace(/\s+/g, "-");
    const fullFilename = `${cleanBase}${extension}`;

    const a = document.createElement("a");
    a.href = url;
    a.download = fullFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (error) {
    console.error("Failed to download media:", error);
  }
}
