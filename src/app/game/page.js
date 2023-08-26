"use client"
import clsx from "clsx";
import PlayerBoard from "./components/PlayerBoard";
import { useState } from "react";
import Link from "next/link";

export default function GamePage() {

  return (
    <main
      className={clsx(
        "flex min-h-screen flex-col items-center p-24",
        "animate-in animate-out fade-in-0 zoom-in" // TODO: animation is broken
      )}
    >
      <PlayerBoard />
      <Link href="/config">Config</Link>
    </main>
  )
}
