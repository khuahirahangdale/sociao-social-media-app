import { useState } from "react";

function ProfileAvatar({ user, className = "" }) {
  const pictureUrl = user?.profile_picture_url;
  const [failedPictureUrl, setFailedPictureUrl] = useState("");
  const initials = (user?.display_name || user?.name || "?")
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (pictureUrl && failedPictureUrl !== pictureUrl) {
    return (
      <img
        className={`avatar ${className}`}
        src={pictureUrl}
        alt=""
        onError={() => setFailedPictureUrl(pictureUrl)}
      />
    );
  }

  return (
    <span
      className={`avatar avatar-${user?.color || "lavender"} ${className}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

export default ProfileAvatar;
