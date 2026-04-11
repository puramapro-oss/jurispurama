import { Alert, Linking, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth } from "@/store/auth";
import { API_BASE } from "@/lib/api";
import {
  LogOut,
  Mail,
  ShieldCheck,
  ExternalLink,
  HelpCircle,
  Share2,
  Star,
} from "lucide-react-native";

export default function ProfilScreen() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);

  async function onSignOut() {
    Alert.alert("Déconnexion", "Tu veux vraiment te déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Se déconnecter",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  const fullName =
    (user?.user_metadata?.full_name as string | undefined) ?? "Maître";
  const email = user?.email ?? "—";

  return (
    <Screen>
      <View style={{ marginBottom: 16, marginTop: 8 }}>
        <Text style={{ color: "#C9A84C", fontSize: 12, letterSpacing: 2 }}>
          PROFIL
        </Text>
        <Text
          style={{ color: "#F5F5F7", fontSize: 24, fontWeight: "700" }}
        >
          {fullName}
        </Text>
        <Text style={{ color: "#9CA3AF", fontSize: 13, marginTop: 2 }}>
          {email}
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        <Card
          testID="profil-help"
          onPress={() => Linking.openURL(`${API_BASE}/aide`)}
        >
          <Row icon={<HelpCircle color="#C9A84C" size={18} />} label="Centre d'aide" />
        </Card>
        <Card
          testID="profil-contact"
          onPress={() => Linking.openURL(`${API_BASE}/contact`)}
        >
          <Row icon={<Mail color="#C9A84C" size={18} />} label="Contacter le support" />
        </Card>
        <Card
          testID="profil-privacy"
          onPress={() =>
            Linking.openURL(`${API_BASE}/politique-confidentialite`)
          }
        >
          <Row
            icon={<ShieldCheck color="#C9A84C" size={18} />}
            label="Confidentialité (RGPD)"
          />
        </Card>
        <Card
          testID="profil-share"
          onPress={() =>
            Linking.openURL(
              "https://wa.me/?text=" +
                encodeURIComponent(
                  "JurisPurama : ton avocat IA dans la poche → https://jurispurama.purama.dev"
                )
            )
          }
        >
          <Row
            icon={<Share2 color="#C9A84C" size={18} />}
            label="Recommander JurisPurama"
          />
        </Card>
        <Card
          testID="profil-rate"
          onPress={() =>
            Linking.openURL("https://apps.apple.com/app/jurispurama/id0")
          }
        >
          <Row icon={<Star color="#C9A84C" size={18} />} label="Noter sur l'App Store" />
        </Card>
        <Card
          testID="profil-web"
          onPress={() => Linking.openURL("https://jurispurama.purama.dev")}
        >
          <Row
            icon={<ExternalLink color="#C9A84C" size={18} />}
            label="Ouvrir le site web"
          />
        </Card>
      </View>

      <View style={{ marginTop: 24 }}>
        <Button testID="profil-signout" variant="secondary" onPress={onSignOut}>
          <Text style={{ color: "#EF4444", fontWeight: "600", fontSize: 16 }}>
            Se déconnecter
          </Text>
        </Button>
      </View>

      <Text
        style={{
          color: "#6B7280",
          textAlign: "center",
          fontSize: 11,
          marginTop: 24,
        }}
      >
        JurisPurama v1.0 · SASU PURAMA · Frasne (25)
      </Text>
    </Screen>
  );
}

function Row({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: "rgba(201,168,76,0.12)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </View>
      <Text
        style={{ color: "#F5F5F7", fontSize: 15, fontWeight: "500", flex: 1 }}
      >
        {label}
      </Text>
      <ExternalLink color="#6B7280" size={14} />
    </View>
  );
}
