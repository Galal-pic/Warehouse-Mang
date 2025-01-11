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

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="*"
            element={
              <>
                <Header />
                <Routes>
                  <Route path="/" element={<Navigate to="/login" />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/createinvoice" element={<CreateInvoice />} />
                  <Route path="/invoices" element={<Invoices />} />
                </Routes>
              </>
            }
          />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
