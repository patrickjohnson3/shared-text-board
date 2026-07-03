function speak() {
  const text = currentText();
  if (!text) return;

  if (!('speechSynthesis' in window)) {
    setStatus(STATUS.speechUnavailable);
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch {
    setStatus(STATUS.speechBlocked);
  }
}
