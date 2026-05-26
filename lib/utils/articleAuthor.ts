export function isSeleneAuthor(author: string | null | undefined): boolean {
  return author?.trim().toLowerCase() === 'selene';
}
