import { AuthProvider } from "./authentication/use-auth";
import { Routes } from "./routes/RouteConfig";

function App() {
  return (
    <AuthProvider>
      <Routes />
    </AuthProvider>
  );
}

export default App;
