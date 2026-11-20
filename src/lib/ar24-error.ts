export class AR24Error extends Error {
  readonly code: 'ar24_unavailable' | 'ar24_unconfirmed'
  readonly status: 503 | 502

  constructor(code: 'ar24_unavailable' | 'ar24_unconfirmed') {
    super(code === 'ar24_unavailable'
      ? 'Le service de recommandé est indisponible. Aucun dépôt n’a été effectué par cette demande.'
      : 'Le résultat du fournisseur n’a pas pu être confirmé. Vérifie le dépôt auprès du support avant toute nouvelle tentative.')
    this.name = 'AR24Error'
    this.code = code
    this.status = code === 'ar24_unavailable' ? 503 : 502
  }
}
