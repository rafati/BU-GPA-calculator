"use client"; // Mark this as a Client Component

import { SessionProvider as Provider } from "next-auth/react";
import React from "react"; // Import React

type Props = {
  children: React.ReactNode;
  // session?: any; // Session prop is usually handled automatically in App Router
};

export function SessionProvider({ children }: Props) {
  return <Provider>{children}</Provider>;
}