import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MenuCategory {
  id: string;
  menu_id: string;
  name: string;
  display_order: number;
  created_at: string;
}

export interface MenuItem {
  id: string;
  menu_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number | null;
  display_order: number;
  is_available: boolean;
  created_at: string;
}

export interface Menu {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  items: MenuItem[];
  categories: MenuCategory[];
}

export const useUserMenu = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["menu", userId],
    queryFn: async () => {
      if (!userId) return null;

      // First get the menu
      const { data: menu, error: menuError } = await supabase
        .from("menus")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (menuError) throw menuError;
      if (!menu) return null;

      // Get menu categories
      const { data: categories, error: categoriesError } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("menu_id", menu.id)
        .order("display_order", { ascending: true });

      if (categoriesError) throw categoriesError;

      // Then get menu items
      const { data: items, error: itemsError } = await supabase
        .from("menu_items")
        .select("*")
        .eq("menu_id", menu.id)
        .order("display_order", { ascending: true });

      if (itemsError) throw itemsError;

      return {
        ...menu,
        items: items || [],
        categories: categories || [],
      } as Menu;
    },
    enabled: !!userId,
  });
};

export const useMyMenu = () => {
  const { user } = useAuth();
  return useUserMenu(user?.id);
};

export const useCreateMenu = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (name: string = "Menú") => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("menus")
        .insert({ user_id: user.id, name })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", user?.id] });
    },
  });
};

export const useCreateMenuItem = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      menuId,
      name,
      description,
      price,
      categoryId,
    }: {
      menuId: string;
      name: string;
      description?: string;
      price?: number;
      categoryId?: string;
    }) => {
      // Get current max display_order
      const { data: existingItems } = await supabase
        .from("menu_items")
        .select("display_order")
        .eq("menu_id", menuId)
        .order("display_order", { ascending: false })
        .limit(1);

      const maxOrder = existingItems?.[0]?.display_order ?? -1;

      const { data, error } = await supabase
        .from("menu_items")
        .insert({
          menu_id: menuId,
          name,
          description: description || null,
          price: price || null,
          display_order: maxOrder + 1,
          category_id: categoryId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", user?.id] });
    },
  });
};

export const useCreateMenuCategory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ menuId, name }: { menuId: string; name: string }) => {
      const { data: existingCategories } = await supabase
        .from("menu_categories")
        .select("display_order")
        .eq("menu_id", menuId)
        .order("display_order", { ascending: false })
        .limit(1);

      const maxOrder = existingCategories?.[0]?.display_order ?? -1;

      const { data, error } = await supabase
        .from("menu_categories")
        .insert({
          menu_id: menuId,
          name,
          display_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", user?.id] });
    },
  });
};

export const useUpdateMenuCategory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from("menu_categories")
        .update({ name })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", user?.id] });
    },
  });
};

export const useDeleteMenuCategory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("menu_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", user?.id] });
    },
  });
};

export const useReorderMenuCategories = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (categories: { id: string; display_order: number }[]) => {
      for (const cat of categories) {
        const { error } = await supabase
          .from("menu_categories")
          .update({ display_order: cat.display_order })
          .eq("id", cat.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", user?.id] });
    },
  });
};

export const useUpdateMenuItem = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      price,
      is_available,
      category_id,
    }: {
      id: string;
      name?: string;
      description?: string | null;
      price?: number | null;
      is_available?: boolean;
      category_id?: string | null;
    }) => {
      const updates: Partial<MenuItem> = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (price !== undefined) updates.price = price;
      if (is_available !== undefined) updates.is_available = is_available;
      if (category_id !== undefined) updates.category_id = category_id;

      const { data, error } = await supabase
        .from("menu_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", user?.id] });
    },
  });
};

export const useDeleteMenuItem = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", user?.id] });
    },
  });
};

export const useReorderMenuItems = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (items: { id: string; display_order: number }[]) => {
      // Update each item's display_order
      for (const item of items) {
        const { error } = await supabase
          .from("menu_items")
          .update({ display_order: item.display_order })
          .eq("id", item.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", user?.id] });
    },
  });
};
