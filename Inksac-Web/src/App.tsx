import { AuthProvider } from "./authentication/use-auth";
import { RouteConfig } from "./routes/RouteConfig";

function App() {
  return (
    <AuthProvider>
      <RouteConfig />
    </AuthProvider>
  );
}

export default App;
