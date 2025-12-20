import Sidebar from '../Sidebar';

export default function SidebarExample() {
  return (
    <div className="w-72 h-[600px] bg-sidebar border rounded-lg">
      <Sidebar
        onQuickCommand={(cmd) => console.log("Command:", cmd)}
        botStatus={{ instagram: true, facebook: false, tiktok: false }}
        uptime="2h 34m"
        commandCount={47}
      />
    </div>
  );
}
