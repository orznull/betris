"use client"
import clsx from "clsx";
import KeybindConfig from "./components/KeybindConfig";
import Link from "next/link"

export default function ConfigPage() {

  return (
    <main
      className={clsx(
        "flex min-h-screen flex-col items-center p-24",
      )}
    >
      <KeybindConfig />
      <Link href="/game">Game</Link>
    </main>
  )
}
