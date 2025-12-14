import Header from '../Header';

export default function HeaderExample() {
  return (
    <Header
      darkMode={true}
      onToggleDarkMode={() => console.log("toggle")}
      activePlatforms={2}
    />
  );
}
