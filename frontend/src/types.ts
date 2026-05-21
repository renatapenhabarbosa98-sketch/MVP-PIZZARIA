// ── Tipos primitivos ──────────────────────────────────────────────────────────

type Tema         = 'light' | 'dark';
type TipoPedido   = 'salao' | 'delivery';
type StatusMesa   = 'livre' | 'ocupada' | 'reservada';
type PapelUsuario = 'admin' | 'garcom' | 'cozinha';
type ToastTipo    = 'info' | 'success' | 'error';

// ── Modelos de dados ──────────────────────────────────────────────────────────

interface Config {
  nome: string;
  logo: string;
  cor: string;
  numMesas: number;
  tema: Tema;
  fonteTamanho: number;
  mesas?: number; // campo legado do localStorage
}

interface Auth {
  token: string | null;
  usuario: Usuario | null;
}

interface Usuario {
  id: number;
  username: string;
  nome: string;
  papel: PapelUsuario;
  deveTrocarSenha: boolean;
}

interface ItemCardapio {
  id: number;
  nome: string;
  tipo: 'pizza' | 'bebida';
  tamanho: string;
  preco: number;
  ativo: boolean;
}

interface Mesa {
  id: number;
  numero: number;
  capacidade: number;
  status: StatusMesa;
  horaAbertura: number | null;
}

interface ItemPedido {
  id: number;
  nome: string;
  preco: number;
  qtd: number;
  obs: string;
}

interface Pedido {
  id: number;
  tipo: TipoPedido;
  mesaId: number | null;
  mesaNum: number | null;
  clienteId: number | null;
  clienteNome: string;
  items: ItemPedido[];
  total: number;
  status: string;
  criadoEm: number;
}

interface Cliente {
  id: number;
  nome: string;
  telefone: string;
  endereco: string;
  mesaReserva: number | null;
  dataEvento: string;
}

interface Pagamento {
  pedidoId: number;
  forma: string;
  valor: number;
  data: number;
  desc: string;
}

interface PedidoTemp {
  items: ItemPedido[];
  tipo: TipoPedido;
  mesaId: number | null;
  clienteId: number | null;
}

interface NextId {
  pedido: number;
  cliente: number;
}

interface AppState {
  auth: Auth;
  config: Config;
  cardapio: ItemCardapio[];
  mesas: Mesa[];
  pedidos: Pedido[];
  clientes: Cliente[];
  pagamentos: Pagamento[];
  nextId: NextId;
  currentPage: string;
  editingItem: number | null;
  editingCliente: number | null;
  pedidoTemp: PedidoTemp;
  fecharPedidoId: number | null;
  kdsTimers: Record<string, unknown>;
  _pedFilter?: string;
}

// ── Payloads de API ───────────────────────────────────────────────────────────

interface ConfigPayload {
  nome: string;
  logo: string;
  cor: string;
  mesas: number;
  tema: Tema;
  fonteTamanho: number;
}

interface ApiCardapioItem {
  id: number;
  nome: string;
  tipo?: string;
  tam?: string;
  tamanho?: string;
  preco: number;
  ativo: boolean;
}

interface ApiConfigResponse {
  nome?: string;
  logo?: string;
  cor?: string;
  mesas?: number;
  numMesas?: number;
  tema?: string;
  fonteTamanho?: number;
}

interface ApiLoginResponse {
  token: string;
  usuario: Usuario;
  erro?: string;
}

interface ApiTrocarSenhaResponse {
  ok: boolean;
  token: string;
  usuario: Usuario;
  erro?: string;
}

interface ApiErro {
  erro: string;
}
