import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ContentProtection } from "@/components/security/ContentProtection";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Search from "./pages/Search";
import Profile from "./pages/Profile";
import Upload from "./pages/Upload";
import ComicDetail from "./pages/ComicDetail";
import EditComic from "./pages/EditComic";
import AddChapter from "./pages/AddChapter";
import EditChapter from "./pages/EditChapter";
import Reader from "./pages/Reader";
import Community from "./pages/Community";
import Browse from "./pages/Browse";
import CreatorDashboard from "./pages/CreatorDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <ContentProtection>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/search" element={<Search />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/comic/:id" element={<ComicDetail />} />
              <Route path="/comic/:id/edit" element={<EditComic />} />
              <Route path="/comic/:id/add-chapter" element={<AddChapter />} />
              <Route path="/comic/:id/edit-chapter/:chapterId" element={<EditChapter />} />
              <Route path="/read/:chapterId" element={<Reader />} />
              <Route path="/community" element={<Community />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/dashboard" element={<CreatorDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ContentProtection>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
