import "modern-css-reset";
import "./global.scss";
import React from "react";
import { Sidebar } from "./Sidebar";
import { Map } from "./Map";
import styles from "./App.module.scss";

export function App() {
  return (
    <div className={styles["wrapper"]}>
      <Sidebar className={styles["sidebar"]!} />
      <Map
        className={styles["map"]!}
        tokens={[
          { id: "abc", x: 30, y: 50, color: "red" },
          { id: "def", x: 80, y: 20, color: "green" },
        ]}
      />
    </div>
  );
}
