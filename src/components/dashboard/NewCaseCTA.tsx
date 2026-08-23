import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export default function NewCaseCTA() {
  return (
    <Card
      padding="lg"
      className="mb-8 border-none bg-gradient-to-br from-[var(--justice)] to-[var(--justice-light)]"
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h2 className="font-serif text-2xl font-semibold text-white md:text-3xl">
            Nouveau dossier juridique
          </h2>
          <p className="mt-2 text-white/80">
            Raconte ton problème à JurisIA. En 3 minutes, tu as un plan
            d&apos;action, les articles de loi qui te protègent et un document
            prêt à signer.
          </p>
        </div>
        <Link href="/chat">
          <Button variant="gold" size="lg">
            Démarrer un dossier
          </Button>
        </Link>
      </div>
    </Card>
  )
}
