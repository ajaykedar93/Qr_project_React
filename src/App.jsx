// src/App.jsx
import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Pages
import Home from "./Pages/Home.jsx";
import Register from "./Pages/Register.jsx";
import Login from "./Pages/Login.jsx";
import Dashboard from "./Pages/Dashboard/Dashboard.jsx";
import ShareAccess from "./Pages/ShareAccess.jsx";
import ViewDoc from "./Pages/ViewDoc.jsx";
import QRScanner from "./Pages/QRScanner.jsx";
import NotFound from "./Pages/NotFound.jsx";
import Navbar from "./Pages/Navbar.jsx"; 


const THEME = {
  bg: `linear-gradient(135deg, #FFF7E6 0%, #E6F8FF 52%, #F6E5FF 100%)`,
  pageMinH: "100vh",
};


function isAuthed() {
  return !!localStorage.getItem("token");
}
function ProtectedRoute({ children }) {
  const loc = useLocation();
  if (!isAuthed()) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }
  return children;
}
function UnauthedOnly({ children }) {
  if (isAuthed()) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}


function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, search]);
  return null;
}

/* ---------- App ---------- */
export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div
        style={{
          background: THEME.bg,
          minHeight: THEME.pageMinH,
          width: "100%",
        }}
      >
     
        <Navbar />

      
        <main style={{ minHeight: "calc(100svh - 56px)", width: "100%" }}>
          <Routes>
           
            <Route path="/" element={<Home />} />

            <Route
              path="/login"
              element={
                <UnauthedOnly>
                  <Login />
                </UnauthedOnly>
              }
            />
            <Route
              path="/register"
              element={
                <UnauthedOnly>
                  <Register />
                </UnauthedOnly>
              }
            />

            <Route path="/share/:shareId" element={<ShareAccess />} />
            <Route path="/view/:documentId" element={<ViewDoc />} />

           
            <Route
              path="/scan"
              element={
                <ProtectedRoute>
                  <QRScanner />
                </ProtectedRoute>
              }
            />

   
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* 404 Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

      <ToastContainer position="top-center" autoClose={2500} theme="dark" />

      </div>
    </BrowserRouter>
  );
}
