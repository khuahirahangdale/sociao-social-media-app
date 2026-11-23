import { useState } from "react";
import "./EmojiPicker.css";

const emojis = ["😀", "🥰", "😂", "😊", "😍", "✨", "❤️", "👍", "🎉", "🌿", "☀️", "🙏"];

function EmojiPicker({ value, onChange, inputRef }) {
  const [isOpen, setIsOpen] = useState(false);

  function insertEmoji(emoji) {
    const input = inputRef.current;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? start;
    const nextValue = `${value.slice(0, start)}${emoji}${value.slice(end)}`;
    onChange(nextValue);
    setIsOpen(false);

    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

  return (
    <span className="emoji-picker">
      <button
        className="emoji-picker-trigger"
        type="button"
        aria-label="Add emoji"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        ☺
      </button>
      {isOpen && (
        <span className="emoji-picker-menu" role="group" aria-label="Choose an emoji">
          {emojis.map((emoji) => (
            <button type="button" key={emoji} aria-label={`Insert ${emoji}`} onClick={() => insertEmoji(emoji)}>
              {emoji}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

export default EmojiPicker;
