import { Heebo } from "next/font/google";
import { LoginPage } from "@/components/login/LoginPage";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
});

export default function HomePage() {
  return (
    <div className={heebo.className}>
      <LoginPage />
    </div>
  );
}
