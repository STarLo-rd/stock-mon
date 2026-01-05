import React from 'react';
import { Circle, Moon, Sun, Menu, User, LogOut, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/components/theme-provider';
import { MarketSelector } from '@/components/MarketSelector';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useStatus } from '../../hooks/usePrices';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
}

/**
 * Header Component - Optimized with React Query
 * Automatically refetches status every 30 seconds with smart caching
 */
export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Use React Query hook - automatically handles caching, refetching, and deduplication
  const { data: status } = useStatus();

  const marketOpen = status?.market?.open ?? false;
  const marketName = 'India';

  const handleLogout = async () => {
    await signOut();
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile menu button - visible on mobile/tablet, hidden on desktop */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h2 className="text-h5 sm:text-h4 font-semibold">Market Crash Monitor</h2>
        <div className="hidden sm:block">
          <MarketSelector />
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Market status - hide badge text on mobile, show icon only */}
        <div className="flex items-center gap-2">
          <Circle
            className={cn(
              "h-3 w-3 flex-shrink-0",
              marketOpen ? "fill-green-500 text-green-500" : "fill-gray-400 text-gray-400"
            )}
          />
          <Badge variant={marketOpen ? "success" : "secondary"} className="hidden sm:inline-flex">
            {marketOpen ? `${marketName} Market Open` : `${marketName} Market Closed`}
          </Badge>
        </div>
        {/* Market selector for mobile */}
        <div className="sm:hidden">
          <MarketSelector />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
        {/* User menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <User className="h-5 w-5" />
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSettings}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};
