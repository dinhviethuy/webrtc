import { RouteObject } from "react-router-dom";
import HomePage from "../pages/Home";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <HomePage />
  }
];