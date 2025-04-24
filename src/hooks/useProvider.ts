import {memoize} from 'proxy-memoize';
import {type RootState, useAppDispatch, useAppSelector} from '@/store'
import {
  addModel,
  addProvider,
  removeModel,
  removeProvider,
  updateModel,
  updateProvider,
  updateProviders
} from '@/store/llm'
import {Model, Provider} from '@/types'

const selectEnabledProviders = memoize(
  ({state}: { state: RootState }) => state.llm.providers.filter((p) => p.enabled)
)

export function useProviders() {
  const providers: Provider[] = useAppSelector((state) => selectEnabledProviders({state}))
  const dispatch = useAppDispatch()

  return {
    providers: providers || {},
    addProvider: (provider: Provider) => dispatch(addProvider(provider)),
    removeProvider: (provider: Provider) => dispatch(removeProvider(provider)),
    updateProvider: (provider: Provider) => dispatch(updateProvider(provider)),
    updateProviders: (providers: Provider[]) => dispatch(updateProviders(providers))
  }
}

export function useAllProviders() {
  return useAppSelector((state) => state.llm.providers)
}

export function useProvider(id: string) {
  const provider = useAppSelector((state) => state.llm.providers.find((p) => p.id === id) as Provider)
  const dispatch = useAppDispatch()

  return {
    provider,
    models: provider?.models || [],
    updateProvider: (provider: Provider) => dispatch(updateProvider(provider)),
    addModel: (model: Model) => dispatch(addModel({providerId: id, model})),
    removeModel: (model: Model) => dispatch(removeModel({providerId: id, model})),
    updateModel: (model: Model) => dispatch(updateModel({providerId: id, model}))
  }
}
