import { useRoutes } from "react-router-dom"
import { routes } from "../router"

export const AllRoute = () => {
  const route = useRoutes(routes)
  return (
    <>
      {route}
    </>
  )
}