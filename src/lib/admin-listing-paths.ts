export function listingEditorHref(request: { id: string; auctionId?: string }) {
  return request.auctionId
    ? `/admin/particuliers/encheres/${request.auctionId}/editer`
    : `/admin/particuliers/demandes/${request.id}/editer`;
}
