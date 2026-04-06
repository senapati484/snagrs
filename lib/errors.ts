export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('private')) {
      return 'This content is private or unavailable.';
    }
    if (message.includes('age')) {
      return 'Age-restricted content cannot be downloaded.';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Check your connection and try again.';
    }
    
    return message;
  }
  
  return 'Something went wrong. Please try again.';
}
