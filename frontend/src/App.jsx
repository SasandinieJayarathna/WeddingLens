import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import UploadPage from "./pages/UploadPage";
import ResultsPage from "./pages/ResultsPage";
import MultiResultsPage from "./pages/MultiResultsPage";
import ComparePage from "./pages/ComparePage";
import VendorCategoriesPage from "./pages/VendorCategoriesPage";
import VendorCategoryPage from "./pages/VendorCategoryPage";
import VendorsByStylePage from "./pages/VendorsByStylePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProfilePage from "./pages/ProfilePage";

// In plain terms: this file is the "map" of the whole website - it says
// which page component shows for which web address (e.g. "/upload" shows
// UploadPage), and whether the navbar shows on that page.
//
// The landing page and the login/signup pages each have their own
// full-screen, immersive layout (hero image / split-panel - see
// LandingPage.jsx and AuthLayout.jsx) rather than the standard navbar +
// page-container shell every other page uses, so the navbar is hidden on
// these routes.
const NAVBAR_HIDDEN_ROUTES = new Set(["/", "/login", "/signup"]);

// Renders the Navbar (except on the immersive full-screen routes) plus
// whichever page matches the current URL.
function Layout() {
  const location = useLocation();
  const showNavbar = !NAVBAR_HIDDEN_ROUTES.has(location.pathname);

  return (
    <>
      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/results-multi" element={<MultiResultsPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/vendors" element={<VendorCategoriesPage />} />
        <Route path="/vendors/category/:category" element={<VendorCategoryPage />} />
        <Route path="/vendors/style/:style" element={<VendorsByStylePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </>
  );
}

// App root: wraps everything in the auth context (so any page can read
// login state) and the router.
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </AuthProvider>
  );
}
