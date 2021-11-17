import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";

import { api } from "../services/api";

import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storageCart = localStorage.getItem("@RocketShoes:cart");

    if (storageCart) return JSON.parse(storageCart);

    return [];
  });

  useEffect(() => {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
  }, [cart]);

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const { amount: stockAmount } = (
        await api.get<Stock>(`/stock/${productId}`)
      ).data;

      if (stockAmount < amount)
        throw new Error("Quantidade solicitada fora de estoque");

      const index = cart.findIndex((product) => product.id === productId);
      if (!cart[index])
        throw new Error("Erro na alteração de quantidade do produto");

      setCart((prev) =>
        prev.map((product) =>
          product.id === productId
            ? {
                ...product,
                amount,
              }
            : product
        )
      );
    } catch (e: any) {
      if (e instanceof Error) toast.error(e.message);
    }
  };

  const addProduct = async (productId: number) => {
    try {
      const { amount: stockAmount } = (
        await api.get<Stock>(`/stock/${productId}`)
      ).data;

      if (stockAmount <= 1)
        throw new Error("Quantidade solicitada fora de estoque");

      const index = cart.findIndex((product) => product.id === productId);

      if (cart[index])
        return updateProductAmount({
          productId,
          amount: cart[index].amount + 1,
        });

      const product = (await api.get<Product>(`/products/${productId}`)).data;

      if (!product) throw new Error("Erro na adição do produto");

      setCart((prev) => [
        ...prev,
        {
          ...product,
          amount: 1,
        },
      ]);
    } catch (e: any) {
      if (e instanceof Error) toast.error(e.message);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const index = cart.findIndex((product) => product.id === productId);
      if (!cart[index]) throw new Error("Erro na remoção do produto");

      setCart((prev) => prev.filter((product) => product.id !== productId));
    } catch (e) {
      if (e instanceof Error) toast.error(e.message);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
