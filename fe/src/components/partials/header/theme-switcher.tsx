"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { hexToRGB } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Moon, Sun } from "lucide-react"
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon"

const ThemeButton = () => {
    const { theme, setTheme } = useTheme();
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button size="icon" rounded="full" aria-label="Đổi giao diện sáng/tối" className="md:bg-secondary bg-transparent text-secondary-foreground shadow-none md:h-8 md:w-8 h-auto w-auto text-default-900 hover:bg-accent">
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 " />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Đổi giao diện sáng/tối</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="p-2">
                <DropdownMenuItem
                    onClick={() => setTheme("light")}
                    className={cn(
                        "p-2 font-medium text-sm text-default-700 cursor-pointer mb-[2px]",
                        {
                            "bg-primary/10 text-primary": theme === "light",
                        }
                    )}
                >
                    <Icon icon="heroicons-outline:sun" className="w-5 h-5 me-2" />
                    <span className="me-2">Light</span>
                    <Check
                        className={cn("w-4 h-4 flex-none ms-auto ", {
                            hidden: theme !== "light",
                        })}
                    />
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setTheme("dark")}
                    className={cn(
                        "p-2 font-medium text-sm text-default-700 cursor-pointer mb-[2px]",
                        {
                            "bg-primary/10 text-primary": theme === "dark",
                        }
                    )}
                >

                    <Icon icon="heroicons-outline:moon" className="w-5 h-5 me-2" />
                    <span className="me-2">Dark</span>
                    <Check
                        className={cn("w-4 h-4 flex-none ms-auto text-default-700", {
                            hidden: theme !== "dark",
                        })}
                    />
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setTheme("system")}
                    className={cn(
                        "p-2 font-medium text-sm text-default-700 cursor-pointer mb-[2px]",
                        {
                            "bg-primary/10 text-primary": theme === "system",
                        }
                    )}
                >
                    <Icon icon="heroicons:computer-desktop" className="w-5 h-5 me-2" />
                    <span className="me-2">system</span>
                    <Check
                        className={cn("w-4 h-4 flex-none ms-auto text-default-700", {
                            hidden: theme !== "system",
                        })}
                    />
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default ThemeButton;
