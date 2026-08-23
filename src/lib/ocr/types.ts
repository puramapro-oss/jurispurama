export interface OcrResult {
  document_type: string
  summary: string
  extracted_text: string
  extracted_fields: Record<string, string | number | null>
  insights: Array<{
    severity: 'info' | 'warning' | 'critical'
    message: string
    legal_basis?: string
  }>
  recommended_actions: Array<{
    action:
      | 'generate_document'
      | 'contest'
      | 'request_refund'
      | 'send_recommande'
      | 'ask_more'
      | 'close'
    label: string
  }>
  deadlines: Array<{ date: string; description: string; critical: boolean }>
}
