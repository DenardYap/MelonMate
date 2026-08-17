export function historyIndexAfterSwipe(
  currentIndex: number,
  itemCount: number,
  deltaX: number,
  deltaY: number
): number {
  if (itemCount <= 0 || Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) {
    return currentIndex;
  }
  return deltaX < 0
    ? Math.min(itemCount - 1, currentIndex + 1)
    : Math.max(0, currentIndex - 1);
}
