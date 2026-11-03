# Практическая №7: Kubernetes, HPA и мониторинг

HTTP-сервис работает в Minikube. Манифест задаёт Deployment с тремя экземплярами, Service и HPA с диапазоном 2–5 подов и целевой загрузкой CPU 50% от запроса ресурса. `/load` занимает процессор примерно на 250 мс, чтобы можно было показать масштабирование.

## Что понадобится

Docker, Minikube, kubectl, Helm и доступ к интернету для загрузки образов и Helm chart. Команды выполняются из корня репозитория. Для проверки самого приложения без Kubernetes: `node test.js` (Node.js 18+).

## Запуск

1. Запустите кластер и включите сбор метрик:

   ```sh
   minikube start --driver=docker --cpus=4 --memory=4096
   minikube addons enable metrics-server
   ```

   Для существующего кластера проверьте контекст: `kubectl config current-context`.

2. Соберите образ внутри Minikube и разверните приложение:

   ```sh
   minikube image build -t lab7:local .
   kubectl apply -f k8s.yaml
   kubectl rollout status deployment/lab7
   kubectl get pods,svc,hpa
   ```

   Deployment первоначально задаёт 3 пода; после получения метрик HPA может уменьшить их число до 2 при отсутствии нагрузки. В первые минуты CPU в HPA может отображаться как `<unknown>`, пока запускается metrics-server.

3. Проверьте приложение. Оставьте эту команду работающей в отдельном терминале:

   ```sh
   kubectl port-forward service/lab7 8080:80
   ```

   Откройте http://localhost:8080 или выполните `curl http://localhost:8080`.

## Prometheus и Grafana

Установите готовый стек в отдельное пространство имён:

```sh
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install lab7-monitoring prometheus-community/kube-prometheus-stack --namespace lab7-monitoring --create-namespace
kubectl -n lab7-monitoring rollout status deployment/lab7-monitoring-grafana --timeout=5m
kubectl -n lab7-monitoring port-forward service/lab7-monitoring-grafana 3000:80
```

Grafana доступна на http://localhost:3000. Логин — `admin`, пароль можно получить в другом терминале:

```sh
kubectl -n lab7-monitoring get secret lab7-monitoring-grafana -o jsonpath='{.data.admin-password}' | base64 --decode; echo
```

В Grafana откройте **Dashboards → Kubernetes / Compute Resources / Namespace (Pods)**, выберите namespace `default` и найдите поды `lab7`. Готовый дашборд показывает использование CPU и памяти; для собственного дашборда создайте панель с источником Prometheus и запросом:

```promql
sum(rate(container_cpu_usage_seconds_total{namespace="default", pod=~"lab7-.*", container="app"}[2m]))
```

Сохраните дашборд, назвав его, например, `Lab 7 CPU`. После начала нагрузки графику может понадобиться несколько минут для накопления данных.

## Демонстрация автомасштабирования

В одном терминале наблюдайте за показателями:

```sh
kubectl get hpa lab7 --watch
```

В другом создайте временный под, который непрерывно обращается к нагрузочному маршруту:

```sh
kubectl run lab7-load --image=busybox:1.36 --restart=Never -- /bin/sh -c 'while true; do wget -q -O /dev/null http://lab7/load; done'
```

Подождите несколько минут, пока HPA получит метрики и увеличит число реплик. Проверьте `kubectl get pods` и график CPU в Grafana. После демонстрации удалите только нагрузочный под:

```sh
kubectl delete pod lab7-load
```

После снятия нагрузки число реплик уменьшится не сразу: Kubernetes использует период стабилизации. Если метрики не появились, проверьте `kubectl top pods`, `kubectl describe hpa lab7` и состояние metrics-server (`kubectl -n kube-system get pods`).
