"use client";

import { useEffect, useState } from "react";
import * as api from "./api";

export function useSubjects() {
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    api
      .listSubjects()
      .then(({ subjects }) => setSubjects(subjects))
      .catch(() => {});
  }, []);

  return subjects;
}
