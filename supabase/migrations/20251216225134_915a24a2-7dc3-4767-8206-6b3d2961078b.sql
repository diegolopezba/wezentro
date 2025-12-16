-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  city TEXT,
  interests TEXT[],
  is_business BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('user_premium', 'business')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'canceled', 'expired', 'past_due')),
  provider TEXT DEFAULT 'stripe',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create follows table
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  location_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE,
  category TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  is_business_event BOOLEAN DEFAULT FALSE,
  has_guestlist BOOLEAN DEFAULT FALSE,
  max_guestlist_capacity INTEGER,
  requires_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create guestlist_entries table
CREATE TABLE public.guestlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  qr_code_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'checked_in')),
  attended BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  checked_in_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(event_id, user_id)
);

-- Create chats table
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('private', 'event', 'group')),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create chat_participants table
CREATE TABLE public.chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(chat_id, user_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'event_card', 'system')),
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create event_interactions table (raw analytics)
CREATE TABLE public.event_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('view', 'join', 'checkin', 'share')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event_analytics table (aggregated)
CREATE TABLE public.event_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL UNIQUE,
  views INTEGER DEFAULT 0,
  guestlist_joins INTEGER DEFAULT 0,
  check_ins INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('follow', 'invite', 'guestlist', 'reminder', 'message', 'system')),
  entity_type TEXT CHECK (entity_type IN ('event', 'user', 'chat', 'guestlist')),
  entity_id UUID,
  title TEXT NOT NULL,
  body TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guestlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id 
    AND status IN ('active', 'trialing')
    AND (current_period_end IS NULL OR current_period_end > NOW())
  )
$$;

-- Function to check subscription plan type
CREATE OR REPLACE FUNCTION public.get_subscription_plan(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT plan_type FROM public.subscriptions
  WHERE user_id = _user_id 
  AND status IN ('active', 'trialing')
  AND (current_period_end IS NULL OR current_period_end > NOW())
  LIMIT 1
$$;

-- Function to check if user is chat participant
CREATE OR REPLACE FUNCTION public.is_chat_participant(_user_id UUID, _chat_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE user_id = _user_id AND chat_id = _chat_id
  )
$$;

-- Trigger function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::TEXT, 8)),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_analytics_updated_at
  BEFORE UPDATE ON public.event_analytics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS POLICIES

-- Profiles: Public read, own write
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- User roles: Only admins can manage, users can read own
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Subscriptions: Own read/write
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own subscription" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Follows: Public read, authenticated create/delete own
CREATE POLICY "Follows are viewable by everyone" ON public.follows
  FOR SELECT USING (true);

CREATE POLICY "Users can follow others" ON public.follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON public.follows
  FOR DELETE USING (auth.uid() = follower_id);

-- Events: Public read (non-deleted), creator manage
CREATE POLICY "Public events are viewable by everyone" ON public.events
  FOR SELECT USING (is_public = true AND deleted_at IS NULL);

CREATE POLICY "Creators can view own events" ON public.events
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can create events" ON public.events
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update own events" ON public.events
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete own events" ON public.events
  FOR DELETE USING (auth.uid() = creator_id);

-- Guestlist entries: Event creator and own user access
CREATE POLICY "Users can view own guestlist entries" ON public.guestlist_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Event creators can view guestlist" ON public.guestlist_entries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND creator_id = auth.uid())
  );

CREATE POLICY "Premium users can join guestlists" ON public.guestlist_entries
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND public.has_active_subscription(auth.uid())
  );

CREATE POLICY "Users can leave guestlist" ON public.guestlist_entries
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Event creators can manage guestlist" ON public.guestlist_entries
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND creator_id = auth.uid())
  );

-- Chats: Participants only
CREATE POLICY "Participants can view chats" ON public.chats
  FOR SELECT USING (
    public.is_chat_participant(auth.uid(), id) AND deleted_at IS NULL
  );

CREATE POLICY "Users can create chats" ON public.chats
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Chat participants: Participants can view, manage own
CREATE POLICY "Participants can view chat members" ON public.chat_participants
  FOR SELECT USING (public.is_chat_participant(auth.uid(), chat_id));

CREATE POLICY "Users can join chats" ON public.chat_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave chats" ON public.chat_participants
  FOR DELETE USING (auth.uid() = user_id);

-- Messages: Participants can view/send
CREATE POLICY "Participants can view messages" ON public.messages
  FOR SELECT USING (
    public.is_chat_participant(auth.uid(), chat_id) AND deleted_at IS NULL
  );

CREATE POLICY "Participants can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND public.is_chat_participant(auth.uid(), chat_id)
  );

-- Event interactions: Own write, event creator read
CREATE POLICY "Users can log own interactions" ON public.event_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Event creators can view interactions" ON public.event_interactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND creator_id = auth.uid())
  );

-- Event analytics: Event creator only
CREATE POLICY "Event creators can view analytics" ON public.event_analytics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND creator_id = auth.uid())
  );

CREATE POLICY "System can update analytics" ON public.event_analytics
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND creator_id = auth.uid())
  );

-- Notifications: Own only
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);
CREATE INDEX idx_events_creator ON public.events(creator_id);
CREATE INDEX idx_events_start_datetime ON public.events(start_datetime);
CREATE INDEX idx_events_category ON public.events(category);
CREATE INDEX idx_events_location ON public.events(latitude, longitude);
CREATE INDEX idx_guestlist_event ON public.guestlist_entries(event_id);
CREATE INDEX idx_guestlist_user ON public.guestlist_entries(user_id);
CREATE INDEX idx_chat_participants_chat ON public.chat_participants(chat_id);
CREATE INDEX idx_chat_participants_user ON public.chat_participants(user_id);
CREATE INDEX idx_messages_chat ON public.messages(chat_id);
CREATE INDEX idx_messages_created ON public.messages(created_at);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_event_interactions_event ON public.event_interactions(event_id);
CREATE INDEX idx_event_interactions_type ON public.event_interactions(type);