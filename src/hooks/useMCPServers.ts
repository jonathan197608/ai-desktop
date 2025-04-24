import {RootState, useAppDispatch, useAppSelector} from '@/store'
import { addMCPServer, deleteMCPServer, setMCPServers, updateMCPServer } from '@/store/mcp'
import { MCPServer } from '@/types'
import {memoize} from 'proxy-memoize';

// Listen for server changes from main process
//listen<{servers: MCPServer[]}>('mcp:servers-changed', (event) => {
//   store.dispatch(setMCPServers(event.payload.servers))
//}).then()

export const useMCPServers = () => {
  const mcpServers = useAppSelector((state) => state.mcp.servers)
  const activedMcpServers = useAppSelector(memoize((state: RootState) => state.mcp.servers?.filter((server) => server.isActive)))
  const dispatch = useAppDispatch()

  return {
    mcpServers,
    activedMcpServers,
    addMCPServer: (server: MCPServer) => dispatch(addMCPServer(server)),
    updateMCPServer: (server: MCPServer) => dispatch(updateMCPServer(server)),
    deleteMCPServer: (id: string) => dispatch(deleteMCPServer(id)),
    setMCPServerActive: (server: MCPServer, isActive: boolean) => dispatch(updateMCPServer({ ...server, isActive })),
    updateMcpServers: (servers: MCPServer[]) => dispatch(setMCPServers(servers))
  }
}
