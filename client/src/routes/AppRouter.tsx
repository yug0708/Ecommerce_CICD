import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminRoute, ProtectedRoute } from '@/components/routing/ProtectedRoute';
import { PageLoader } from '@/components/routing/PageHelpers';
import { AccountLayout } from '@/layouts/AccountLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { StoreLayout } from '@/layouts/StoreLayout';

const HomePage = lazy(() => import('@/pages/HomePage'));
const ProductsPage = lazy(() => import('@/pages/ProductsPage'));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'));
const CartPage = lazy(() => import('@/pages/CartPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const AccountOverviewPage = lazy(() => import('@/pages/account/AccountOverviewPage'));
const AccountOrdersPage = lazy(() => import('@/pages/account/AccountOrdersPage'));
const AccountOrderDetailPage = lazy(() => import('@/pages/account/AccountOrderDetailPage'));
const AccountProfilePage = lazy(() => import('@/pages/account/AccountProfilePage'));
const AccountAddressesPage = lazy(() => import('@/pages/account/AccountAddressesPage'));
const AccountWishlistPage = lazy(() => import('@/pages/account/AccountWishlistPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminProductsPage = lazy(() => import('@/pages/admin/AdminProductsPage'));
const AdminOrdersPage = lazy(() => import('@/pages/admin/AdminOrdersPage'));
const AdminCustomersPage = lazy(() => import('@/pages/admin/AdminCustomersPage'));
const AdminCategoriesPage = lazy(() => import('@/pages/admin/AdminCategoriesPage'));
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage'));
const OrderConfirmationPage = lazy(() => import('@/pages/OrderConfirmationPage'));
const StyleGuidePage = lazy(() => import('@/pages/StyleGuidePage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<StoreLayout />}>
        <Route
          index
          element={
            <Lazy>
              <HomePage />
            </Lazy>
          }
        />
        <Route
          path="products"
          element={
            <Lazy>
              <ProductsPage />
            </Lazy>
          }
        />
        <Route
          path="products/:slug"
          element={
            <Lazy>
              <ProductDetailPage />
            </Lazy>
          }
        />
        <Route
          path="cart"
          element={
            <Lazy>
              <CartPage />
            </Lazy>
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route
            path="checkout"
            element={
              <Lazy>
                <CheckoutPage />
              </Lazy>
            }
          />
          <Route
            path="orders/:orderId/confirmation"
            element={
              <Lazy>
                <OrderConfirmationPage />
              </Lazy>
            }
          />
          <Route path="account" element={<AccountLayout />}>
            <Route
              index
              element={
                <Lazy>
                  <AccountOverviewPage />
                </Lazy>
              }
            />
            <Route
              path="orders"
              element={
                <Lazy>
                  <AccountOrdersPage />
                </Lazy>
              }
            />
            <Route
              path="orders/:orderId"
              element={
                <Lazy>
                  <AccountOrderDetailPage />
                </Lazy>
              }
            />
            <Route
              path="profile"
              element={
                <Lazy>
                  <AccountProfilePage />
                </Lazy>
              }
            />
            <Route
              path="addresses"
              element={
                <Lazy>
                  <AccountAddressesPage />
                </Lazy>
              }
            />
            <Route
              path="wishlist"
              element={
                <Lazy>
                  <AccountWishlistPage />
                </Lazy>
              }
            />
          </Route>
        </Route>
      </Route>

      <Route element={<AuthLayout />}>
        <Route
          path="login"
          element={
            <Lazy>
              <LoginPage />
            </Lazy>
          }
        />
        <Route
          path="register"
          element={
            <Lazy>
              <RegisterPage />
            </Lazy>
          }
        />
        <Route
          path="forgot-password"
          element={
            <Lazy>
              <ForgotPasswordPage />
            </Lazy>
          }
        />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route
            index
            element={
              <Lazy>
                <AdminDashboardPage />
              </Lazy>
            }
          />
          <Route
            path="products"
            element={
              <Lazy>
                <AdminProductsPage />
              </Lazy>
            }
          />
          <Route
            path="orders"
            element={
              <Lazy>
                <AdminOrdersPage />
              </Lazy>
            }
          />
            <Route
              path="customers"
              element={
                <Lazy>
                  <AdminCustomersPage />
                </Lazy>
              }
            />
            <Route
              path="categories"
              element={
                <Lazy>
                  <AdminCategoriesPage />
                </Lazy>
              }
            />
            <Route
              path="settings"
              element={
                <Lazy>
                  <AdminSettingsPage />
                </Lazy>
              }
            />
        </Route>
      </Route>

      <Route
        path="styleguide"
        element={
          <Lazy>
            <StyleGuidePage />
          </Lazy>
        }
      />

      <Route path="home" element={<Navigate to="/" replace />} />
      <Route
        path="*"
        element={
          <Lazy>
            <NotFoundPage />
          </Lazy>
        }
      />
    </Routes>
  );
}
