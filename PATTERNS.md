# Patterns vérifiés — JurisPurama

- Une réponse externe ou DB expirée peut avoir produit un effet distant. Ne pas annoncer un rollback ; utiliser réservation et reprise durable avec reçu de transaction.
- Une notification durable se crée dans la transaction du changement métier. Son contenu exact, sa clé d'idempotence et son premier essai précèdent le POST ; la durée de reprise doit rester dans la garantie réelle du fournisseur.
- RLS ne protège pas TRUNCATE : les tables de contrôle service-only doivent retirer les privilèges hérités et l'exécution publique de leurs RPC.

Preuves et limites : [AR24 durable](docs/audit-juridique/ar24-queue-2026-11-16.md).
