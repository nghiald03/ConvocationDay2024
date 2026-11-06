import { useAtom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import { layoutType, sidebarType, navBarType} from "@/lib/type"



export type Config = {
  collapsed: boolean
  theme: string
  skin: 'default' | 'bordered'
  layout: layoutType
  sidebar: sidebarType
  menuHidden: boolean,
  showSearchBar: boolean,
  showSwitcher: boolean
  topHeader: 'default' | 'links'
  contentWidth: 'wide' | 'boxed'
  navbar: navBarType
  footer: 'sticky' | 'default' | 'hidden'
  isRtl: boolean
  subMenu: boolean
  hasSubMenu: boolean
  sidebarTheme: string,
  headerTheme: string,
  sidebarBgImage?: string
  radius: number

}
export const defaultConfig: Config = {
  collapsed: false,
  theme: "zinc",
  skin: 'default',
  layout: "vertical",
  sidebar: 'classic',
  menuHidden: false,
  showSearchBar: true,
  topHeader: 'default',
  contentWidth: 'wide',
  navbar: 'sticky',
  footer: 'default',
  isRtl: false,
  showSwitcher: true,
  subMenu: false,
  hasSubMenu: false,
  sidebarTheme: 'light',
  headerTheme: 'light',
  sidebarBgImage: undefined,
  radius: 0.5,
}


// getOnInit: read the saved layout (collapsed sidebar, skin, ...) on the very first read
// instead of one render later, so the sidebar/content don't visibly resize after mount.
// Safe because the whole tree only renders client-side after MountedProvider mounts.
const configAtom = atomWithStorage<Config>("config", defaultConfig, undefined, { getOnInit: true })

export function useConfig() {
  
  return useAtom(configAtom)
}
