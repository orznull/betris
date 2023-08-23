"use client"
import clsx from "clsx";
import PlayerBoard from "./components/PlayerBoard";

export default function Board() {

  // TODO: check focus
  

  return (
    <main
      className={clsx(
        "flex min-h-screen flex-col items-center justify-betwee p-24",
        "animate-in animate-out fade-in-0 zoom-in" // TODO: animation is broken
      )}
    >
      <PlayerBoard />
    </main>
  )
}
