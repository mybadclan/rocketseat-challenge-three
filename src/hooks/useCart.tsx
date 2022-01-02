import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const currentProduct = cart.find(c => c.id === productId);
      const { data: stockData } = await api.get<Stock>(`stock/${productId}`);
      const { data: productData } = await api.get(`/products/${productId}`);

      if (!productData) {
        return;
      }

      if (stockData.amount < 1) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (currentProduct && currentProduct.amount >= stockData.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (currentProduct) {
        const newCart = cart.map(c => c.id === productId ? ({ ...c, amount: c.amount + 1 }) : c)

        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      } else {
        const newCart = [...cart, { ...productData, amount: 1 }]

        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const ids = cart.map(c => c.id);

      if (!ids.includes(productId)) {
        throw new Error('Erro na remoção do produto');
      }

      const newCart = cart.filter(c => c.id !== productId);
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const { data: stockData } = await api.get<Stock>(`/stock/${productId}`);

      if (!stockData.amount) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }

      if (amount > stockData.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = cart.map(c => c.id === productId ? ({ ...c, amount }) : c);
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch (err: any) {
      toast.error('Erro na alteração de quantidade do produto');
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
