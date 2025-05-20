import "./App.css";
import Header from "./components/header/Header";
import Login from "./pages/loginPage/Login";
import Register from "./pages/registerPage/Register";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Users from "./pages/usersPage/Users";
import CreateInvoice from "./pages/createInvoicePage/CreateInvoice";
import Invoices from "./pages/invoicesPage/Invoices";
import Items from "./pages/itemsPage/Items";
import Machines from "./pages/machinesPage/Machines";
import Mechanisms from "./pages/mechanismsPage/Mechanisms";
import Supliers from "./pages/supliers/Supliers";
import ProtectedRoute from "./components/protectPages/ProtectedRoute";
import Report from "./pages/reportPage/Report";

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route
              path="/*"
              element={
                <>
                  <Header />
                  <Routes>
                    <Route path="/users" element={<Users />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/createinvoice" element={<CreateInvoice />} />
                    <Route path="/invoices" element={<Invoices />} />
                    <Route path="/reports" element={<Report />} />
                    <Route path="/others/items" element={<Items />} />
                    <Route path="/others/machines" element={<Machines />} />
                    <Route path="/others/mechanisms" element={<Mechanisms />} />
                    <Route path="/others/supliers" element={<Supliers />} />
                  </Routes>
                </>
              }
            />
          </Route>
        </Routes>
      </Router>
    </div>
  );
}

export default App;
