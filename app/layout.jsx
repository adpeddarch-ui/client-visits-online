import "./styles.css";

export const metadata = {
  title: "ตารางเข้าพบลูกค้าออนไลน์",
  description: "ตารางเข้าพบลูกค้าสำหรับทีม 6 คน",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
