import { useState } from "react";
import NavigationMenu from '../NavigationMenu';

export default function NavigationMenuExample() {
  const [active, setActive] = useState("structure");
  return (
    <div className="w-64 h-96 bg-sidebar border rounded-lg">
      <NavigationMenu activeSection={active} onSectionChange={setActive} />
    </div>
  );
}
