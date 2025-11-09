import torch
import torch.nn as nn

class TCNModel(nn.Module):
    def __init__(self, input_dim, num_channels=[32, 16], kernel_size=2, dropout=0.5):
        super(TCNModel, self).__init__()
        self.tcn_layers = nn.ModuleList()
        in_channels = 1
        
        for out_channels in num_channels:
            self.tcn_layers.append(nn.Sequential(
                nn.Conv1d(in_channels, out_channels, kernel_size, padding=kernel_size//2),
                nn.BatchNorm1d(out_channels),
                nn.ReLU(),
                nn.Dropout(dropout)
            ))
            in_channels = out_channels
        
        self.fc = nn.Linear(num_channels[-1] * input_dim, 2)
    
    def forward(self, x):
        x = x.unsqueeze(1)
        for layer in self.tcn_layers:
            x = layer(x)
        x = x.flatten(1)
        return self.fc(x)

model = TCNModel(16)
x = torch.randn(1, 16)
print(f'Input shape: {x.shape}')
x_test = x.unsqueeze(1)
print(f'After unsqueeze: {x_test.shape}')
for i, layer in enumerate(model.tcn_layers):
    x_test = layer(x_test)
    print(f'After layer {i}: {x_test.shape}')
x_flat = x_test.flatten(1)
print(f'Flattened: {x_flat.shape}')
print(f'Expected FC input: {16*16}={256}, Got: {x_flat.shape[1]}')
