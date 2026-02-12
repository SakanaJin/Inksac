import { AuthProvider } from "./authentication/use-auth";
import { AppLayout } from "./components/layout/app-layout";
import { RouteConfig } from "./routes/RouteConfig";

function App() {
  return (
    <AuthProvider>
      <AppLayout>
        <RouteConfig />
      </AppLayout>
    </AuthProvider>
  );
}

export default App;
